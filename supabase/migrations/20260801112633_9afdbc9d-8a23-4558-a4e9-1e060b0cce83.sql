
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('student', 'admin');
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'dinner');
CREATE TYPE public.booking_status AS ENUM ('booked', 'cancelled', 'attended');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  roll_number TEXT,
  hostel TEXT,
  room_number TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin profile delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, roll_number, hostel, room_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'hostel',
    NEW.raw_user_meta_data->>'room_number'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- MEAL SLOTS
CREATE TABLE public.meal_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  meal public.meal_type NOT NULL,
  menu TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 150 CHECK (capacity > 0),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booking_cutoff_minutes INTEGER NOT NULL DEFAULT 60 CHECK (booking_cutoff_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_date, meal)
);
CREATE INDEX meal_slots_date_idx ON public.meal_slots (slot_date);
GRANT SELECT ON public.meal_slots TO authenticated;
GRANT ALL ON public.meal_slots TO service_role;
ALTER TABLE public.meal_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots readable" ON public.meal_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "slots admin write" ON public.meal_slots FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT INSERT, UPDATE, DELETE ON public.meal_slots TO authenticated;

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.meal_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL DEFAULT 'booked',
  token_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(9), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, student_id),
  UNIQUE (token_code)
);
CREATE INDEX bookings_student_idx ON public.bookings (student_id);
CREATE INDEX bookings_slot_idx ON public.bookings (slot_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "own bookings delete" ON public.bookings FOR DELETE TO authenticated USING (student_id = auth.uid() OR public.is_admin());

-- capacity + cutoff enforcement
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.meal_slots; taken INTEGER;
BEGIN
  SELECT * INTO s FROM public.meal_slots WHERE id = NEW.slot_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Meal slot not found'; END IF;
  IF (s.slot_date + s.start_time) - make_interval(mins => s.booking_cutoff_minutes) < now() THEN
    RAISE EXCEPTION 'Booking closed for this slot';
  END IF;
  SELECT count(*) INTO taken FROM public.bookings WHERE slot_id = NEW.slot_id AND status <> 'cancelled';
  IF taken >= s.capacity THEN RAISE EXCEPTION 'This slot is full'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bookings_validate BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.validate_booking();

-- CHECK-INS
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.meal_slots(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'qr',
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX check_ins_slot_idx ON public.check_ins (slot_id);
GRANT SELECT, INSERT ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins read" ON public.check_ins FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "own checkins insert" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR public.is_admin());

-- REVIEWS + RATINGS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.meal_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall SMALLINT NOT NULL CHECK (overall BETWEEN 1 AND 5),
  taste SMALLINT NOT NULL CHECK (taste BETWEEN 1 AND 5),
  hygiene SMALLINT NOT NULL CHECK (hygiene BETWEEN 1 AND 5),
  quantity SMALLINT NOT NULL CHECK (quantity BETWEEN 1 AND 5),
  temperature SMALLINT NOT NULL CHECK (temperature BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  emoji TEXT,
  image_url TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_slot_idx ON public.reviews (slot_id);
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews insert attended" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.check_ins c WHERE c.booking_id = reviews.booking_id AND c.student_id = auth.uid()
  ));
CREATE POLICY "reviews update own or admin" ON public.reviews FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

-- POLLS
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_day TEXT,
  meal public.meal_type,
  closes_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls readable" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "polls admin write" ON public.polls FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX poll_options_poll_idx ON public.poll_options (poll_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "options readable" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "options admin write" ON public.poll_options FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, student_id)
);
GRANT SELECT, INSERT ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own votes read" ON public.votes FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "own votes insert" ON public.votes FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- AI PLANS
CREATE TABLE public.ai_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'menu',
  title TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_plans TO authenticated;
GRANT ALL ON public.ai_plans TO service_role;
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai plans admin" ON public.ai_plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- AGGREGATE VIEWS (owner-run, expose counts only)
CREATE VIEW public.slot_availability AS
  SELECT s.id AS slot_id, s.slot_date, s.meal, s.menu, s.capacity, s.start_time, s.end_time,
         s.booking_cutoff_minutes,
         COALESCE(b.booked, 0)::int AS booked_seats,
         (s.capacity - COALESCE(b.booked, 0))::int AS remaining_seats,
         COALESCE(c.checked_in, 0)::int AS checked_in_count
  FROM public.meal_slots s
  LEFT JOIN (SELECT slot_id, count(*) AS booked FROM public.bookings WHERE status <> 'cancelled' GROUP BY slot_id) b ON b.slot_id = s.id
  LEFT JOIN (SELECT slot_id, count(*) AS checked_in FROM public.check_ins GROUP BY slot_id) c ON c.slot_id = s.id;
GRANT SELECT ON public.slot_availability TO authenticated;

CREATE VIEW public.slot_rating_stats AS
  SELECT r.slot_id, s.slot_date, s.meal, s.menu,
         count(*)::int AS review_count,
         round(avg(r.overall)::numeric, 2) AS avg_overall,
         round(avg(r.taste)::numeric, 2) AS avg_taste,
         round(avg(r.hygiene)::numeric, 2) AS avg_hygiene,
         round(avg(r.quantity)::numeric, 2) AS avg_quantity,
         round(avg(r.temperature)::numeric, 2) AS avg_temperature
  FROM public.reviews r JOIN public.meal_slots s ON s.id = r.slot_id
  GROUP BY r.slot_id, s.slot_date, s.meal, s.menu;
GRANT SELECT ON public.slot_rating_stats TO authenticated;

CREATE VIEW public.poll_results AS
  SELECT o.poll_id, o.id AS option_id, o.label, count(v.id)::int AS votes
  FROM public.poll_options o LEFT JOIN public.votes v ON v.option_id = o.id
  GROUP BY o.poll_id, o.id, o.label;
GRANT SELECT ON public.poll_results TO authenticated;

-- SEED: 14 days of slots
INSERT INTO public.meal_slots (slot_date, meal, menu, capacity, start_time, end_time, booking_cutoff_minutes)
SELECT d::date, m.meal, m.menu, m.cap, m.st, m.et, 45
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 13, interval '1 day') AS d
CROSS JOIN (VALUES
  ('breakfast'::public.meal_type, 'Poha, Boiled Eggs, Banana, Tea & Coffee', 220, TIME '07:30', TIME '09:30'),
  ('lunch'::public.meal_type, 'Rajma Chawal, Roti, Salad, Buttermilk', 260, TIME '12:30', TIME '14:30'),
  ('dinner'::public.meal_type, 'Paneer Butter Masala, Jeera Rice, Roti, Gulab Jamun', 240, TIME '19:30', TIME '21:30')
) AS m(meal, menu, cap, st, et);

-- SEED: sample poll
WITH p AS (
  INSERT INTO public.polls (title, description, target_day, meal, closes_at)
  VALUES ('Monday Lunch Special', 'Vote for next Monday''s lunch main course', 'Monday', 'lunch', now() + interval '5 days')
  RETURNING id
)
INSERT INTO public.poll_options (poll_id, label)
SELECT p.id, label FROM p, (VALUES ('Paneer Butter Masala'), ('Rajma Chawal'), ('Chole Bhature'), ('Mix Veg')) AS o(label);

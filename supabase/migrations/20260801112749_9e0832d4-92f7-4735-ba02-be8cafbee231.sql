
DROP VIEW IF EXISTS public.slot_availability;
DROP VIEW IF EXISTS public.slot_rating_stats;
DROP VIEW IF EXISTS public.poll_results;

CREATE OR REPLACE FUNCTION public.get_slot_availability(_from DATE DEFAULT CURRENT_DATE, _to DATE DEFAULT (CURRENT_DATE + 13))
RETURNS TABLE (
  slot_id UUID, slot_date DATE, meal public.meal_type, menu TEXT, capacity INT,
  start_time TIME, end_time TIME, booking_cutoff_minutes INT,
  booked_seats INT, remaining_seats INT, checked_in_count INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.slot_date, s.meal, s.menu, s.capacity, s.start_time, s.end_time, s.booking_cutoff_minutes,
         COALESCE(b.booked, 0)::int,
         (s.capacity - COALESCE(b.booked, 0))::int,
         COALESCE(c.checked_in, 0)::int
  FROM public.meal_slots s
  LEFT JOIN (SELECT slot_id, count(*) AS booked FROM public.bookings WHERE status <> 'cancelled' GROUP BY slot_id) b ON b.slot_id = s.id
  LEFT JOIN (SELECT slot_id, count(*) AS checked_in FROM public.check_ins GROUP BY slot_id) c ON c.slot_id = s.id
  WHERE s.slot_date BETWEEN _from AND _to
  ORDER BY s.slot_date, s.start_time;
$$;
REVOKE EXECUTE ON FUNCTION public.get_slot_availability(DATE, DATE) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_slot_availability(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_slot_rating_stats()
RETURNS TABLE (
  slot_id UUID, slot_date DATE, meal public.meal_type, menu TEXT, review_count INT,
  avg_overall NUMERIC, avg_taste NUMERIC, avg_hygiene NUMERIC, avg_quantity NUMERIC, avg_temperature NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.slot_id, s.slot_date, s.meal, s.menu, count(*)::int,
         round(avg(r.overall)::numeric, 2), round(avg(r.taste)::numeric, 2), round(avg(r.hygiene)::numeric, 2),
         round(avg(r.quantity)::numeric, 2), round(avg(r.temperature)::numeric, 2)
  FROM public.reviews r JOIN public.meal_slots s ON s.id = r.slot_id
  GROUP BY r.slot_id, s.slot_date, s.meal, s.menu
  ORDER BY s.slot_date DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_slot_rating_stats() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_slot_rating_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_poll_results()
RETURNS TABLE (poll_id UUID, option_id UUID, label TEXT, votes INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.poll_id, o.id, o.label, count(v.id)::int
  FROM public.poll_options o LEFT JOIN public.votes v ON v.option_id = o.id
  GROUP BY o.poll_id, o.id, o.label
  ORDER BY 4 DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_poll_results() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_poll_results() TO authenticated;

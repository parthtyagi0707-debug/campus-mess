-- Redeem a QR meal token at the counter (admin only).
CREATE OR REPLACE FUNCTION public.redeem_token(_token_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.bookings;
  s public.meal_slots;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only mess managers can check students in.';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE token_code = _token_code;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Unknown token.';
  END IF;
  IF b.status = 'cancelled' THEN
    RAISE EXCEPTION 'This booking was cancelled.';
  END IF;
  IF b.status = 'attended' THEN
    RAISE EXCEPTION 'Token already used.';
  END IF;

  SELECT * INTO s FROM public.meal_slots WHERE id = b.slot_id;
  IF s.slot_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'This token is for %, not today.', s.slot_date;
  END IF;

  INSERT INTO public.check_ins (booking_id, student_id, slot_id, method)
  VALUES (b.id, b.student_id, b.slot_id, 'qr');

  UPDATE public.bookings SET status = 'attended' WHERE id = b.id;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (b.student_id, 'Checked in', 'Enjoy your ' || s.meal || '. Rate it afterwards!');

  RETURN 'Checked in: ' || s.meal || ' (' || s.slot_date || ')';
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_token(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_token(text) TO authenticated;
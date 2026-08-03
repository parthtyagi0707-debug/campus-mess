REVOKE ALL ON FUNCTION public.get_slot_availability(date, date) FROM anon;
REVOKE ALL ON FUNCTION public.get_slot_rating_stats() FROM anon;
REVOKE ALL ON FUNCTION public.get_poll_results() FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.redeem_token(text) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_slot_availability(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slot_rating_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_poll_results() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_token(text) TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_token(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_token(text) TO authenticated;
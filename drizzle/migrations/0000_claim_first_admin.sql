CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Serialize all claim attempts so the check + insert is atomic.
  PERFORM pg_advisory_xact_lock(hashtext('public.claim_first_admin'));

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' AND user_id = _uid) THEN
      RETURN 'already_admin';
    END IF;
    RETURN 'already_claimed';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  RETURN 'granted';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
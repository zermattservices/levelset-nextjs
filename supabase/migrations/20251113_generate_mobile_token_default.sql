-- Ensure pgcrypto is available for random token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_location_mobile_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
BEGIN
  LOOP
    token := upper(replace(gen_random_uuid()::text, '-', ''));
    token := substring(token FROM 1 FOR 12);
    EXIT WHEN token IS NOT NULL
      AND length(token) = 12
      AND NOT EXISTS (
        SELECT 1 FROM public.locations WHERE location_mobile_token = token
      );
  END LOOP;
  RETURN token;
END;
$$;

ALTER TABLE public.locations
ALTER COLUMN location_mobile_token SET DEFAULT public.generate_location_mobile_token();

UPDATE public.locations
SET location_mobile_token = public.generate_location_mobile_token()
WHERE location_mobile_token IS NULL;

CREATE OR REPLACE FUNCTION public.set_location_mobile_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.location_mobile_token IS NULL THEN
    NEW.location_mobile_token := public.generate_location_mobile_token();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_location_mobile_token ON public.locations;

CREATE TRIGGER trg_set_location_mobile_token
BEFORE INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.set_location_mobile_token();


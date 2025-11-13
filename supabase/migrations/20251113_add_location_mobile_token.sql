-- Add location_mobile_token to locations for unauthenticated mobile access
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS location_mobile_token TEXT UNIQUE;

COMMENT ON COLUMN public.locations.location_mobile_token IS
  'Twelve-character token for mobile PWA access, unique per location.';

CREATE OR REPLACE FUNCTION public.new_location_mobile_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_token text;
BEGIN
  LOOP
    new_token := translate(upper(encode(gen_random_bytes(9), 'base64')), '/+=', '');
    new_token := substr(new_token, 1, 12);

    IF length(new_token) = 12
       AND NOT EXISTS (
         SELECT 1
         FROM public.locations
         WHERE location_mobile_token = new_token
       ) THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_location_mobile_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.location_mobile_token IS NULL THEN
    NEW.location_mobile_token := public.new_location_mobile_token();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_location_mobile_token
BEFORE INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.generate_location_mobile_token();

UPDATE public.locations
SET location_mobile_token = public.new_location_mobile_token()
WHERE location_mobile_token IS NULL;


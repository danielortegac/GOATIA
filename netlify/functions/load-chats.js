-- 1. CREA LA FUNCIÓN QUE MANEJA A UN NUEVO USUARIO
-- Esta función crea un perfil con 0 créditos iniciales.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, credits, last_credits_granted_at)
  VALUES (new.id, 0, NULL);
  RETURN new;
END;
$$;

-- 2. CREA EL TRIGGER QUE LLAMA A LA FUNCIÓN ANTERIOR
-- Se dispara automáticamente cuando un usuario se registra en Supabase Auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. FUNCIÓN PARA OTORGAR CRÉDITOS MENSUALES (VERSIÓN FINAL)
-- Esta es la única función que debe dar los 100 créditos.
CREATE OR REPLACE FUNCTION grant_monthly_credits_if_needed(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_last_granted_at TIMESTAMPTZ;
BEGIN
  SELECT last_credits_granted_at
  INTO profile_last_granted_at
  FROM public.profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF profile_last_granted_at IS NULL OR profile_last_granted_at < (now() - interval '30 days') THEN
    UPDATE public.profiles
    SET 
      credits = 100,
      last_credits_granted_at = now()
    WHERE id = user_id_param;
  END IF;
END;
$$;

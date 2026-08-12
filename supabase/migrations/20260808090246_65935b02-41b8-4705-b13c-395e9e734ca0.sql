-- 1. Harden helper functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    CASE
      WHEN NEW.email = 'eddy@kapelczak.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger functions must never be callable through the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_booking_overlap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 2. Prevent self privilege escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can change a user role.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 3. Rebuild policies scoped to authenticated users only
-- bookings
DROP POLICY IF EXISTS "Admins can delete all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings or admins can delete any bo" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

CREATE POLICY "Signed-in users can view all bookings"
ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own bookings"
ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Users or admins can delete bookings"
ON public.bookings FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- comments
DROP POLICY IF EXISTS "Admins can delete all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments or admins can delete any co" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can update all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments or admins can update any co" ON public.comments;

CREATE POLICY "Signed-in users can view all comments"
ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own comments"
ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or admins can update comments"
ON public.comments FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Users or admins can delete comments"
ON public.comments FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- instruments
DROP POLICY IF EXISTS "Admin delete access for instruments" ON public.instruments;
DROP POLICY IF EXISTS "Admins can delete instruments" ON public.instruments;
DROP POLICY IF EXISTS "Admin insert access for instruments" ON public.instruments;
DROP POLICY IF EXISTS "Admins can insert instruments" ON public.instruments;
DROP POLICY IF EXISTS "Admin update access for instruments" ON public.instruments;
DROP POLICY IF EXISTS "Admins can update instruments" ON public.instruments;
DROP POLICY IF EXISTS "Anyone can view instruments" ON public.instruments;
DROP POLICY IF EXISTS "Public read access for instruments" ON public.instruments;
DROP POLICY IF EXISTS "Users can view instruments" ON public.instruments;

CREATE POLICY "Signed-in users can view instruments"
ON public.instruments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert instruments"
ON public.instruments FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update instruments"
ON public.instruments FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete instruments"
ON public.instruments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- maintenance_history
DROP POLICY IF EXISTS "Admins can delete maintenance history" ON public.maintenance_history;
DROP POLICY IF EXISTS "Admins can insert maintenance history" ON public.maintenance_history;
DROP POLICY IF EXISTS "Admins can update maintenance history" ON public.maintenance_history;
DROP POLICY IF EXISTS "Anyone can view maintenance history" ON public.maintenance_history;
DROP POLICY IF EXISTS "Users can view maintenance history" ON public.maintenance_history;

CREATE POLICY "Signed-in users can view maintenance history"
ON public.maintenance_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert maintenance history"
ON public.maintenance_history FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update maintenance history"
ON public.maintenance_history FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete maintenance history"
ON public.maintenance_history FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. Revoke anon table access where policies are authenticated-only
REVOKE ALL ON public.bookings FROM anon;
REVOKE ALL ON public.comments FROM anon;
REVOKE ALL ON public.instruments FROM anon;
REVOKE ALL ON public.maintenance_history FROM anon;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instruments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_history TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
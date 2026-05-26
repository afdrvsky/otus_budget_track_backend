-- Auto-create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Еда', 'expense', '#EF4444', true),
    (NEW.id, 'Транспорт', 'expense', '#3B82F6', true),
    (NEW.id, 'Жильё', 'expense', '#F59E0B', true),
    (NEW.id, 'Развлечения', 'expense', '#8B5CF6', true),
    (NEW.id, 'Здоровье', 'expense', '#10B981', true),
    (NEW.id, 'Одежда', 'expense', '#EC4899', true),
    (NEW.id, 'Образование', 'expense', '#6366F1', true),
    (NEW.id, 'Другое', 'expense', '#6B7280', true);
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Зарплата', 'income', '#10B981', true),
    (NEW.id, 'Фриланс', 'income', '#3B82F6', true),
    (NEW.id, 'Инвестиции', 'income', '#F59E0B', true),
    (NEW.id, 'Подарки', 'income', '#EC4899', true),
    (NEW.id, 'Другое', 'income', '#6B7280', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

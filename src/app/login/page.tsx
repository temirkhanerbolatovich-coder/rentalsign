import { redirect } from "next/navigation";
import { getAdmin } from "@/auth/session";
import { LoginForm } from "./login-form";
import { findApartment } from "@/catalog/apartments";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ apartment?: string }>;
}) {
  const { apartment: slug } = await searchParams;
  const apartment = typeof slug === "string" ? findApartment(slug) : undefined;
  // Only a known catalog slug can change the destination after login.
  const destination = apartment
    ? `/contracts/new?apartment=${encodeURIComponent(apartment.slug)}`
    : "/dashboard";
  if (await getAdmin()) redirect(destination);
  return (
    <LoginForm destination={destination} apartmentTitle={apartment?.title} />
  );
}

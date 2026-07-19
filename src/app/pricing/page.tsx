import { redirect } from "next/navigation";

/** Legacy Pro URL — tips live at /support. */
export default function PricingRedirectPage() {
  redirect("/support");
}

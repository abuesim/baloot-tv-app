import { redirect } from "next/navigation";

// الفرق صارت داخل كل بطولة — هذه الصفحة تحوّل للبطولات
export default function TeamsPage() {
  redirect("/tournaments");
}

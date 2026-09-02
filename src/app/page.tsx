import { redirect } from "next/navigation";

export default function Home() {
  // O `proxy` cuida do resto: sem sessão vai para /login.
  redirect("/dashboard");
}

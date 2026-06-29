import { redirect } from 'next/navigation';

// هذا المسار محجوب — كل من يحاول /admin يُحوَّل تلقائياً
export default function AdminRedirect() {
  redirect('/bogga');
}

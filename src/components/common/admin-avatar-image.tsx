import { AvatarImage } from "@/components/ui/avatar";
import { useAdminPhoto } from "@/lib/admin-photo-store";
import { admin } from "@/lib/mock-data";

export function AdminAvatarImage() {
  const photo = useAdminPhoto();
  if (!photo) return null;
  return <AvatarImage key={photo} src={photo} alt={admin.name} />;
}

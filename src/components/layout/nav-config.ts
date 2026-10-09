import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import { bookings, serviceAreas, services } from "@/lib/mock-data";

export interface NavChild {
  label: string;
  to: string;
  search?: Record<string, string>;
  badge?: number;
}

export interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  children?: NavChild[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const buildNavGroups = (): NavGroup[] => [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      {
        label: "Bookings",
        to: "/bookings",
        icon: CalendarCheck,
        badge: String(bookings.filter((booking) => booking.status === "Pending").length),
        children: [
          { label: "All Bookings", to: "/bookings" },
          {
            label: "Pending",
            to: "/bookings",
            search: { status: "Pending" },
            badge: bookings.filter((booking) => booking.status === "Pending").length,
          },
          {
            label: "Cancelled",
            to: "/bookings",
            search: { status: "Cancelled" },
            badge: bookings.filter((booking) => booking.status === "Cancelled").length,
          },
        ],
      },
      {
        label: "Services",
        to: "/services",
        icon: Wrench,
        children: [
          { label: "All Services", to: "/services" },
          {
            label: "Pending",
            to: "/services",
            search: { view: "pending" },
            badge: services.filter((service) => !service.active).length,
          },
          { label: "Cancelled", to: "/services", search: { view: "cancelled" }, badge: 0 },
        ],
      },
      {
        label: "Service Areas",
        to: "/service-areas",
        icon: MapPin,
        children: [
          { label: "All Areas", to: "/service-areas" },
          {
            label: "Upcoming",
            to: "/service-areas",
            search: { view: "upcoming" },
            badge: serviceAreas.filter(
              (area) => !area.active && area.technicians === 0 && area.activeBookings === 0,
            ).length,
          },
          {
            label: "Paused",
            to: "/service-areas",
            search: { view: "paused" },
            badge: serviceAreas.filter((area) => !area.active).length,
          },
        ],
      },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Customers", to: "/customers", icon: Users },
      { label: "Reports", to: "/reports", icon: BarChart3 },
      { label: "Spare Parts", to: "/spare-parts", icon: Package, badge: "4" },
      { label: "Billing", to: "/billing", icon: CreditCard },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", to: "/profile", icon: UserCircle },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/technicians": "Technicians",
  "/bookings": "Bookings",
  "/services": "Services",
  "/service-areas": "Service Areas",
  "/customers": "Customers",
  "/reports": "Reports",
  "/spare-parts": "Spare Parts",
  "/billing": "Billing",
  "/profile": "Profile",
  "/settings": "Settings",
};

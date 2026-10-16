export const inr = (value: number, compact = false) => {
  if (compact) {
    const absolute = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    const formatCompact = (amount: number, suffix: string) => {
      const rounded =
        amount >= 10 ? Math.round(amount).toString() : amount.toFixed(1).replace(/\.0$/, "");
      return `${sign}₹${rounded}${suffix}`;
    };
    if (absolute >= 10_000_000) return formatCompact(absolute / 10_000_000, "Cr");
    if (absolute >= 100_000) return formatCompact(absolute / 100_000, "L");
    if (absolute >= 1_000) return formatCompact(absolute / 1_000, "K");
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

export const num = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(iso);
};

export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

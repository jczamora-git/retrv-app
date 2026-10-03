import type { Component } from "vue";
import {
  FileText,
  Footprints,
  Gamepad2,
  Gem,
  GraduationCap,
  KeyRound,
  Package,
  PawPrint,
  Shirt,
  ShoppingBag,
  Smartphone,
  Users,
  Wallet
} from "lucide-vue-next";
import { normalizeCategoryKey } from "./categories";

export const CATEGORY_ICON_MAP: Record<string, Component> = {
  pets: PawPrint,
  accessories: Gem,
  bags: ShoppingBag,
  people: Users,
  gadgets: Smartphone,
  walletsandcards: Wallet,
  keys: KeyRound,
  documentsandids: FileText,
  clothing: Shirt,
  footwear: Footprints,
  schoolandoffice: GraduationCap,
  toys: Gamepad2,
  other: Package
};

export function getCategoryIcon(keyOrName: string): Component {
  const norm = normalizeCategoryKey(keyOrName);
  return CATEGORY_ICON_MAP[norm] || Package;
}

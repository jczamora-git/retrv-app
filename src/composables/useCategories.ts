import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../utils/supabase";
import {
  MAIN_CATEGORIES,
  normalizeCategoryKey,
  getCategoryConfig
} from "../config/categories";

const customSubcategoriesByCat = ref<Record<string, Record<string, string>>>({});
let listenerConsumers = 0;
let realtimeChannel: any = null;

export interface ResolvedCustomSubcategory {
  name: string;
  normalizedKey: string;
  categoryKey: string;
  isNew: boolean;
}

export async function resolveCustomSubcategory(
  categoryName: string,
  rawSubCategory: string
): Promise<ResolvedCustomSubcategory> {
  const mainCat = getCategoryConfig(categoryName);
  if (!mainCat) throw new Error("Choose a main category first.");
  const trimmed = rawSubCategory.trim().normalize("NFC");
  const categoryKey = mainCat.key;
  const normalizedKey = normalizeCategoryKey(trimmed);
  if (!normalizedKey) throw new Error("Enter a subcategory with letters or numbers.");
  if (trimmed.length > 80) throw new Error("Subcategory must be 80 characters or fewer.");

  const matchedDefault = mainCat.subcategories.find(
    (name) => normalizeCategoryKey(name) === normalizedKey
  );
  const cachedName = customSubcategoriesByCat.value[categoryKey]?.[normalizedKey];
  if (matchedDefault || cachedName) {
    return { name: matchedDefault || cachedName, normalizedKey, categoryKey, isNew: false };
  }

  try {
    const { data } = await supabase
      .from("subcategories")
      .select("name, normalized_key")
      .eq("category_key", categoryKey)
      .eq("normalized_key", normalizedKey)
      .maybeSingle();

    if (data && typeof data.name === "string") {
      const name = data.name.trim();
      customSubcategoriesByCat.value[categoryKey] ||= {};
      customSubcategoriesByCat.value[categoryKey][normalizedKey] = name;
      return { name, normalizedKey, categoryKey, isNew: false };
    }
  } catch {}

  return { name: trimmed, normalizedKey, categoryKey, isNew: true };
}

export function useCategories() {
  const fetchSubcategories = async () => {
    try {
      const { data } = await supabase.from("subcategories").select("*");
      if (data && Array.isArray(data)) {
        const mapped: Record<string, Record<string, string>> = {};
        data.forEach((item) => {
          const catKey = item.category_key;
          const subKey = item.normalized_key;
          if (catKey && subKey && item.name) {
            mapped[catKey] ||= {};
            mapped[catKey][subKey] = item.name.trim();
          }
        });
        customSubcategoriesByCat.value = mapped;
      }
    } catch (err) {
      console.warn("[useCategories] Failed fetching subcategories:", err);
    }
  };

  const initSubcategoriesListener = () => {
    fetchSubcategories();

    if (!realtimeChannel) {
      try {
        realtimeChannel = supabase
          .channel("public:subcategories")
          .on("postgres_changes", { event: "*", schema: "public", table: "subcategories" }, () => {
            fetchSubcategories();
          })
          .subscribe();
      } catch (err) {
        console.warn("[useCategories] Realtime subscription note:", err);
      }
    }
  };

  const getSubcategoriesForCategory = (categoryName: string): string[] => {
    const mainCat = getCategoryConfig(categoryName);
    const normCatKey = mainCat?.key || normalizeCategoryKey(categoryName);

    const defaults = mainCat ? [...mainCat.subcategories] : [];
    const customObj = customSubcategoriesByCat.value[normCatKey] || {};

    const seenNormKeys = new Set<string>();
    const result: string[] = [];

    defaults.forEach((sub) => {
      const k = normalizeCategoryKey(sub);
      if (k && !seenNormKeys.has(k)) {
        seenNormKeys.add(k);
        result.push(sub);
      }
    });

    Object.values(customObj).forEach((name) => {
      const normKey = normalizeCategoryKey(name);
      if (normKey && !seenNormKeys.has(normKey)) {
        seenNormKeys.add(normKey);
        result.push(name.trim());
      }
    });

    return result;
  };

  onMounted(() => {
    listenerConsumers += 1;
    initSubcategoriesListener();
  });

  onUnmounted(() => {
    listenerConsumers -= 1;
    if (listenerConsumers === 0 && realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  });

  return {
    mainCategories: MAIN_CATEGORIES,
    customSubcategoriesByCat,
    getSubcategoriesForCategory,
    resolveCustomSubcategory,
    normalizeCategoryKey
  };
}

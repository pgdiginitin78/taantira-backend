const { REQUIRED_IMAGE_ANGLES, MATCHING_JEWELLERY_BY_MAIN } = require('../data/sareeCatalogueData');

const normalizeCsvParam = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const buildGalleryAngles = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const mainSlug = product?.primaryCategory?.parent?.slug || product?.primaryCategory?.slug || '';

  if (mainSlug === 'jewellery') {
    if (images.length === 0) {
      return [
        {
          angleNumber: 1,
          key: 'front',
          label: 'Primary View',
          desc: 'Product studio photography',
          status: 'image-needed',
          image_url: null,
        },
      ];
    }
    return images.map((img, idx) => ({
      angleNumber: idx + 1,
      key: `view-${idx + 1}`,
      label: idx === 0 ? 'Primary View' : `View ${idx + 1}`,
      desc: img.alt_text || product.name,
      status: 'available',
      image_url: img.image_url,
      alt_text: img.alt_text || product.name,
    }));
  }

  return REQUIRED_IMAGE_ANGLES.map((angle, idx) => {
    const matched =
      images.find((img) => img.angle_key === angle.key || Number(img.sort_order) === idx + 1) ||
      (idx === 0 && images[0]?.image_url ? images[0] : null);

    return {
      angleNumber: idx + 1,
      key: angle.key,
      label: angle.label,
      desc: angle.desc,
      status: matched?.image_url ? 'available' : 'image-needed',
      image_url: matched?.image_url || null,
      alt_text: matched?.alt_text || `${product?.name || 'Saree'} — ${angle.label}`,
    };
  });
};

const getMatchingJewellery = (mainCategorySlug) =>
  MATCHING_JEWELLERY_BY_MAIN[mainCategorySlug] || MATCHING_JEWELLERY_BY_MAIN['banarasi-sarees'] || [];

const filterCatalogueRecords = (
  products = [],
  {
    collection = null,
    categories = [],
    subcategories = [],
    fabrics = [],
    q = '',
    minPrice = null,
    maxPrice = null,
    inStock = false,
  } = {}
) => {
  const catList = normalizeCsvParam(categories);
  const subList = normalizeCsvParam(subcategories);
  const fabList = normalizeCsvParam(fabrics);
  const query = String(q || '').trim().toLowerCase();

  let matched = Array.isArray(products) ? [...products] : [];

  if (collection && catList.length === 0 && subList.length === 0) {
    if (collection === 'sarees') {
      matched = matched.filter((p) => p.primaryCategory?.slug !== 'jewellery');
    } else if (collection === 'jewellery' || collection === 'jewellery-pairing') {
      matched = matched.filter((p) => p.primaryCategory?.slug === 'jewellery');
    } else if (collection === 'new-arrivals') {
      matched = matched.filter((p) => Boolean(p.is_new_arrival));
    } else if (collection === 'best-sellers') {
      matched = matched.filter((p) => Boolean(p.is_best_seller));
    } else if (collection === 'festive-collections') {
      matched = matched.filter((p) => Boolean(p.is_featured || p.is_best_seller || p.primaryCategory?.slug === 'jewellery'));
    } else if (collection !== 'all') {
      matched = matched.filter(
        (p) => p.primaryCategory?.slug === collection || p.primaryCategory?.parent?.slug === collection
      );
    }
  }

  if (catList.length > 0) {
    matched = matched.filter((p) => {
      const mainSlug = p.primaryCategory?.parent?.slug || p.primaryCategory?.slug;
      const subSlug = p.primaryCategory?.slug;
      return catList.includes(mainSlug) || catList.includes(subSlug);
    });
  }

  if (subList.length > 0) {
    matched = matched.filter((p) => subList.includes(p.primaryCategory?.slug));
  }

  if (fabList.length > 0) {
    const normalizedFabrics = fabList.map((f) => f.toLowerCase());
    matched = matched.filter((p) => normalizedFabrics.includes(String(p.fabric || '').toLowerCase()));
  }

  if (query) {
    matched = matched.filter((p) => {
      const catName = p.primaryCategory?.name || p.subcategory || '';
      const parentName = p.primaryCategory?.parent?.name || p.category || '';
      return (
        String(p.name || '').toLowerCase().includes(query) ||
        String(p.fabric || '').toLowerCase().includes(query) ||
        String(catName).toLowerCase().includes(query) ||
        String(parentName).toLowerCase().includes(query) ||
        String(p.sku || '').toLowerCase().includes(query)
      );
    });
  }

  if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
    const minVal = Number(minPrice);
    if (!Number.isNaN(minVal)) {
      matched = matched.filter((p) => Number(p.sale_price ?? p.base_price ?? 0) >= minVal);
    }
  }

  if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
    const maxVal = Number(maxPrice);
    if (!Number.isNaN(maxVal)) {
      matched = matched.filter((p) => Number(p.sale_price ?? p.base_price ?? 0) <= maxVal);
    }
  }

  if (inStock === true || inStock === 'true') {
    matched = matched.filter((p) => (p.variants || []).some((v) => Number(v.stock_qty || 0) > 0));
  }

  return matched;
};

const computeCatalogueFacets = (allActiveProducts = [], allActiveCategories = []) => {
  const parentCategories = allActiveCategories.filter((c) => !c.parent_id);
  const childCategories = allActiveCategories.filter((c) => Boolean(c.parent_id));
  const categoryById = new Map(allActiveCategories.map((c) => [c.id, c]));

  const categoriesFacet = parentCategories.map((main) => ({
    name: main.name,
    slug: main.slug,
    count: allActiveProducts.filter((p) => {
      const mainSlug = p.primaryCategory?.parent?.slug || p.primaryCategory?.slug;
      return mainSlug === main.slug;
    }).length,
  }));

  const subcategoriesFacet = childCategories.map((sub) => {
    const parent = sub.parent || categoryById.get(sub.parent_id) || {};
    const subProducts = allActiveProducts.filter((p) => p.primaryCategory?.slug === sub.slug);
    return {
      name: sub.name,
      slug: sub.slug,
      parent_slug: parent.slug || '',
      parent_name: parent.name || '',
      fabric: subProducts[0]?.fabric || '',
      count: subProducts.length,
    };
  });

  const fabricCounts = new Map();
  for (const prod of allActiveProducts) {
    if (prod.fabric) {
      fabricCounts.set(prod.fabric, (fabricCounts.get(prod.fabric) || 0) + 1);
    }
  }

  const fabricsFacet = Array.from(fabricCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    categories: categoriesFacet,
    subcategories: subcategoriesFacet,
    fabrics: fabricsFacet,
  };
};

module.exports = {
  normalizeCsvParam,
  buildGalleryAngles,
  getMatchingJewellery,
  filterCatalogueRecords,
  computeCatalogueFacets,
};

const providerSearchUrls = {
  8: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  15: (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
  119: (title) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`,
  1899: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
  283: (title) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
  337: (title) => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
  350: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  386: (title) => `https://www.peacocktv.com/search?query=${encodeURIComponent(title)}`,
  531: (title) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(title)}`,
};

export function getProviderUrl(provider, title, fallbackUrl) {
  const buildUrl = providerSearchUrls[provider.provider_id];
  return buildUrl ? buildUrl(title) : fallbackUrl;
}
async function run() {
  // Test the kiwik AJAX endpoint
  const ajaxUrl = "https://9anime.org.lv/wp-admin/admin-ajax.php";
  const malId = "58567";
  const ep = "13";
  const security = "30a0b83c6d";
  
  console.log("Testing kiwik AJAX...");
  const formData = new URLSearchParams();
  formData.append("action", "get_kiwik_streams");
  formData.append("malId", malId);
  formData.append("ep", ep);
  formData.append("security", security);
  
  const res = await fetch(ajaxUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": "https://9anime.org.lv/solo-leveling-season-2-arise-from-the-shadow-episode-1/"
    },
    body: formData.toString()
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response (first 2000 chars):", text.substring(0, 2000));
}

run().catch(console.error);

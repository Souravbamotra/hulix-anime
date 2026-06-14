
async function test() {
  const formData = new URLSearchParams();
  formData.append("action", "load_episode_range");
  formData.append("range_start", "1");
  formData.append("range_end", "9999");
  formData.append("seri_id", "123");
  formData.append("nonce", "864b8db93f");

  const res = await fetch("https://gogoanimes.cv/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString()
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text.substring(0, 500));
}
test();


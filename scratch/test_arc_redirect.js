async function test() {
  const url = "https://codedew.com/zipper/?url=%2FVGu9nG%2F8cOT%2FvKpTzDDrnbYEgvHwwppRO3kCl4BaE8e%2FgSclmVbFL9Vr3%2FVXg6oBFbLV9fmPG%2F6okcOYSUTwosRf9gtMlgXWA8ROIrnjgM6NRHn5lPJE1aGdkL%2B3u1gBPAz2%2BVmk0Ek%2FELC1ypHadmsFWw%3D";
  
  console.log("Fetching Arc 1 Zipper URL...");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    }
  });
  
  console.log("Status:", res.status);
  console.log("Final URL:", res.url);
  
  const html = await res.text();
  console.log("HTML (first 1500 chars):", html.slice(0, 1500));
}

test().catch(err => console.error(err));

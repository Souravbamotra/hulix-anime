async function testRedirect(name, url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log(`${name} redirects to:`, res.url);
  } catch (err) {
    console.error(`Error for ${name}:`, err);
  }
}

async function run() {
  await testRedirect("Season 2", "https://codedew.com/zipper/?url=lcwNNZjhYwX2VJIE8FlZf%2FTWz5rXetoD7GmfQym6Xgzit%2FDiOXQNAcUrPRreK4v1RmM%2BnxoG0PA61eIxgFUrMrSMrUYLxH%2BbcieL7sRBP9ht1mY9cQapV3KKy%2F77gn7Havo%3D");
  await testRedirect("Season 3", "https://codedew.com/zipper/?url=CkDmECyftFhLO0rpksCHb80sAM2RZxbmlvdUsAYS8%2FybFt%2BSfyIUXf%2BMqGr3iRnLllw9m7ToGsT2lPRGOn7tyiGFjy9L2tlXguEU6bi2nBtKHK0ZsTbJBdg7L4WCznpFWRw%3D");
  await testRedirect("Season 4", "https://codedew.com/zipper/?url=P68uh%2FzWdGQ3xDccVOktS0inOsjp4RO9FQynGTjd66YjocaZHLECmPHqfsyOdVKhzSAjeAztRDRNSvlnSIlrOm74wdTQqkMhOP9FHxu4xAzpGUJkXYRFDwz%2BRe2oEX3swto%3D");
}

run();

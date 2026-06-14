async function run() {
  const url = "https://codedew.com/zipper/?url=Y5WnqArr8oeMDNVXZdAl9%2BKd%2FmK1eNfOauh%2B5TsQ%2F4gS8fJsLpCpCoAbiEmSaXrLNrWPvzyJoOpfTn4L2SFprzowGfXtUoYSFOs5VZzL7iKUrhu01R2URtbiGpCwjPE97dqeev9bBN5V";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log("Redirected to URL:", res.url);
  } catch (err) {
    console.error("Error following redirect:", err);
  }
}

run();

async function queryImage(base64Image) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: base64Image
      })
    }
  );

  return await response.json();
}

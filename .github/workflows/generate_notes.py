import os

from google import genai

def generate_test_notes():
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)

        with open("commits.txt", "r") as f:
            commits = f.read()
        with open("changes.diff", "r") as f:
            diff = f.read()[:5000]

        system_instruction = "You are a specialized tool that outputs ONLY raw Markdown for GitHub Releases. No conversational text, no greetings, no backticks."
        prompt = f"""Generate professional release notes in Markdown.
        Version: {os.environ["TAG_NAME"]}
        
        Structure:
        ## 🚀 Features
        ## 🐛 Bug Fixes
        ## ⚙️ Technical Changes

        COMMITS:
        {commits}

        DIFF:
        {diff}
        """

        print("Enviando para o Gemini... Aguarde.")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction
            ),
        )

        clean_text = response.text.strip()
        if clean_text.startswith("```markdown"):
            clean_text = clean_text.replace("```markdown", "", 1).replace("```", "", -1)
        elif clean_text.startswith("```"):
            clean_text = clean_text.replace("```", "", 2)

        with open("gemini_notes.md", "w", encoding="utf-8") as f:
            f.write(response.text)

        print("✅ Sucesso! O arquivo 'gemini_notes.md' foi gerado.")

    except Exception as e:
        print(f"❌ ERRO LOCAL: {str(e)}")


if __name__ == "__main__":
    generate_test_notes()

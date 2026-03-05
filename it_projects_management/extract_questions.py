import os
import glob
import re

def extract_questions():
    files = sorted(glob.glob("lecture_*.md"))
    output = []
    output.append("# Запитання для самоперевірки з лекцій\n")
    
    for filename in files:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Extract the block starting with ## Запитання для самоперевірки or similar
        match = re.search(r'##\s*Запитання для самоперевірки\s*(.*?)(?:\n##|$)', content, re.DOTALL | re.IGNORECASE)
        if match:
            questions = match.group(1).strip()
            # Adding lecture number
            lecture_num = re.search(r'lecture_(\d+)\.md', filename).group(1)
            output.append(f"## Лекція {int(lecture_num)}")
            output.append(questions)
            output.append("")
        else:
            print(f"No questions found in {filename}")

    with open("questions.md", "w", encoding='utf-8') as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    extract_questions()

import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), "api", "count.json");
  const file = JSON.parse(fs.readFileSync(filePath, "utf8"));

  file.visits += 1; // increment global count

  fs.writeFileSync(filePath, JSON.stringify(file, null, 2));

  res.status(200).json({ visits: file.visits });
}

import fs from "fs"
import path from "path"

export async function GET() {
  const cwd = process.cwd()
  const dataDir = path.join(cwd, "hvac_construction_dataset")
  const dataDirExists = fs.existsSync(dataDir)

  let files: string[] = []
  let sampleData = ""

  if (dataDirExists) {
    files = fs.readdirSync(dataDir)
    const contractsPath = path.join(dataDir, "contracts.csv")
    if (fs.existsSync(contractsPath)) {
      const content = fs.readFileSync(contractsPath, "utf-8")
      const lines = content.split("\n")
      sampleData = `${lines.length} lines. Header: ${lines[0]?.substring(0, 100)}`
    }
  }

  // Also try listing cwd contents
  let cwdFiles: string[] = []
  try {
    cwdFiles = fs.readdirSync(cwd)
  } catch (e) {
    cwdFiles = [`ERROR: ${e}`]
  }

  return Response.json({
    cwd,
    cwdFiles,
    dataDir,
    dataDirExists,
    files,
    sampleData,
  })
}

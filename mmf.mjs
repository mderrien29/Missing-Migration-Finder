import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process'
import { exec } from 'node:child_process'

const getUserInputForFilename = async () => {
  const readline = createInterface(stdin, stdout)
  const filename = await readline.question('missing migration filename > ')
  readline.close()
  return filename
}

const listBranches = () => new Promise(resolve =>
  exec('git branch --sort=-committerdate  | cut -c 3-', (_, stdout) => 
    resolve(stdout.split('\n'))
  )
)

const listFilesInFolder = (branch, folder) => new Promise(resolve => 
  exec(`git ls-tree ${branch} -r --name-only ${folder}`, (_, stdout) => 
    resolve(stdout.split('\n'))
  )
)

const pullFile = (branch, file) => new Promise(resolve => 
  exec(`git checkout ${branch} -- ${file}`, resolve)
)

const getProbableContainerName = () => {
  return process.cwd().split('/').pop().replace('indb-','')+'-node'
}

const showSuccessPrompt = (filenameWithPath) => {
  console.log(`Missing file ${filenameWithPath} downloaded`)
  console.log('Connect to container')
  console.log(`    docker exec -it ${getProbableContainerName()} bash`)
  console.log('and rollback migration')
  console.log('    npx knex migrate:down')
}

const showFailurePrompt = (error) => {
  console.log(`Failed with error : ${error}`)
}

try {
  const filename = await getUserInputForFilename()
  const folder = 'migrations'
  const filenameWithPath = `${folder}/${filename}`
  console.log(`Looking for file "${filenameWithPath}"`)

  const branches = await listBranches()
  console.log(`Looking in ${branches.length} branches`)

  for (const branch of branches) {
    const files = await listFilesInFolder(branch, folder)
    if (files.includes(filenameWithPath)) {
      console.log(`Found file in ${branch}`)
      await pullFile(branch, filenameWithPath)
      showSuccessPrompt(filenameWithPath)
      process.exit(0)
    }
  }

  showFailurePrompt('file not found...')
  process.exit(1)
} catch (e) {
  showFailurePrompt(e)
  process.exit(2)
}


import chalk from "chalk";

/** A small header printed at the top of each command. */
export function printArt() {
  console.log(
    "\n" +
      chalk.cyan.bold("  dash4devs") +
      chalk.dim(" · platform") +
      chalk.dim("  — build · deploy · cache\n"),
  );
}

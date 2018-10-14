---
layout: post
title: "FLARE ON 2018 - Ultimate Minesweeper"
date: 2018-10-13
---

This challenge reads:

> You hacked your way into the Minesweeper Championship, good job. Now its time to compete. Here is the Ultimate Minesweeper binary. Beat it, win the championship, and we'll move you on to greater challenges.

After downloading and extracting the 7zip file, I ran the executable. This showed a 30x30 minesweeper game which is obviously rigged. After clicking on bombs for my first try twice, I gave up and opened the executable in [dnSpy](https://github.com/0xd4d/dnSpy) to take a look at the source.

There is a lot of information in dnSpy that isn't necessary for this challenge. I just drilled down until I got to the `MainForm` class. The `MainForm` class has a private method called `GetKey` which takes a `List<uint>` of the cells we clicked on. The method goes on to seed a random number generator with the first three clicked cells and uses that random sequence to generate the key. I didn't spend much time looking at this method since the 30x30 space is small enough to simply brute force.

![dnSpy hierarchy](/files/2018/10/ultimate-minesweeper.png)

I copied the `GetKey` method into a new C# project, wrote code to loop over each cell, started the program, and walked away. Less than 15 minutes later, I had my answer. The flag for level 2 is `Ch3aters_Alw4ys_W1n@flare-on.com`.

If you are interested, here's the brute force program I threw together in order to discover the flag. There are several optimizations which could decrease the runtime, but it worked great for a quick hack!

```cs
using System;
using System.Collections.Generic;
using System.Text;

namespace Minesweeper_Flag
{
    class Program
    {
        static void Main(string[] args)
        {
            const int rowMax = 30;
            const int colMax = 30;

            for (uint c1 = 0; c1 < colMax; c1++)
            {
                for (uint r1 = 0; r1 < rowMax; r1++)
                {
                    Console.WriteLine(c1 * colMax + r1 + " / " + rowMax * colMax);
                    for (uint c2 = 0; c2 < colMax; c2++)
                    {
                        for (uint r2 = 0; r2 < rowMax; r2++)
                        {
                            for (uint c3 = 0; c3 < colMax; c3++)
                            {
                                for (uint r3 = 0; r3 < rowMax; r3++)
                                {
                                    List<uint> rev = new List<uint>();
                                    rev.Add(r1 * 30 + c1);
                                    rev.Add(r2 * 30 + c2);
                                    rev.Add(r3 * 30 + c3);
                                    var key = GetKey(rev);
                                    if (key.EndsWith("@flare-on.com"))
                                    {
                                        Console.WriteLine("Found key: " + key);
                                        goto done;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            done:
            Console.WriteLine("Finished!");
            Console.ReadLine();
        }

        static string GetKey(List<uint> revealedCells)
        {
            revealedCells.Sort();
            Random random = new Random(Convert.ToInt32(revealedCells[0] << 20 | revealedCells[1] << 10 | revealedCells[2]));
            byte[] array = new byte[32];
            byte[] array2 = new byte[]
            {
                245,
                75,
                65,
                142,
                68,
                71,
                100,
                185,
                74,
                127,
                62,
                130,
                231,
                129,
                254,
                243,
                28,
                58,
                103,
                179,
                60,
                91,
                195,
                215,
                102,
                145,
                154,
                27,
                57,
                231,
                241,
                86
            };
            random.NextBytes(array);
            uint num = 0u;
            while ((ulong)num < (ulong)((long)array2.Length))
            {
                byte[] array3 = array2;
                uint num2 = num;
                array3[(int)num2] = (byte)(array3[(int)num2] ^ array[(int)num]);
                num += 1u;
            }
            return Encoding.ASCII.GetString(array2);
        }
    }
}

```

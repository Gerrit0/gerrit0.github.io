---
layout: post
title: "FLARE ON 2018 - Minesweeper Championship Registration"
date: 2018-10-13
---

This is the first year I heard about the FLARE-On CTF by FireEye, which this year ran from August 24 through October 5. There were a total of 12 levels, of which I was able to complete 3. I got roughly a third of the way through the fourth challenge before getting distracted with PicoCTF.

Let's get started! The first challenge reads:

> Welcome to the Fifth Annual Flare-On Challenge! The Minesweeper World Championship is coming soon and we found the registration app. You weren't officially invited but if you can figure out what the code is you can probably get in anyway. Good luck!

An encrypted `.7z` file is provided. Once downloaded and extracted, we are left with a `MinesweeperChampionshipRegistration.jar` file. I didn't even bother running it. Googling `java decompiler` brought me to http://www.javadecompilers.com, where I was able to upload the jar and receive a single file in return:

```java
import javax.swing.JOptionPane;

public class InviteValidator {
  public InviteValidator() {}

  public static void main(String[] args) { String response = JOptionPane.showInputDialog(null, "Enter your invitation code:", "Minesweeper Championship 2018", 3);
    if (response.equals("GoldenTicket2018@flare-on.com"))
    {
      JOptionPane.showMessageDialog(null, "Welcome to the Minesweeper Championship 2018!\nPlease enter the following code to the ctfd.flare-on.com website to compete:\n\n" + response, "Success!", -1);
    }
    else
    {
      JOptionPane.showMessageDialog(null, "Incorrect invitation code. Please try again next year.", "Failure", 0);
    }
  }
}
```

The first flag is obviously `GoldenTicket2018@flare-on.com`.

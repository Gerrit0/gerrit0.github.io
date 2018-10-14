---
layout: post
title: "FLARE ON 2018 - FLEGGO"
date: 2018-10-13
---

This challenge reads:

> When you are finished with your media interviews and talk show appearances after that crushing victory at the Minesweeper Championship, I have another task for you. Nothing too serious, as you'll see, this one is child's play.

Downloading the 7zip file and extracting it presents us with a long list of executable files. Running one of the programs asks for a password, and then tells us to go step on a brick!

I tried loading one of the executables in [dnSpy](https://github.com/0xd4d/dnSpy), but found that these executables were not compiled to MSIL. I poked around in [Ida](https://www.hex-rays.com/products/ida/support/download_freeware.shtml) for a bit but didn't notice anything immediately obvious until I scrolled randomly through the hex view tab. Here, I got lucky and noticed some strings:

```text
00001920: 1840 4000 6840 4000 4200 5200 4900 4300  .@@.h@@.B.R.I.C.
00001930: 4b00 0000 2500 7300 5c00 2500 7300 0000  K...%.s.\.%.s...
00001940: 4900 7200 6f00 6e00 4d00 6100 6e00 5300  I.r.o.n.M.a.n.S.
00001950: 7500 6300 6b00 7300 0000 0000 4f00 6800  u.c.k.s.....O.h.
00001960: 2c00 2000 6800 6500 6c00 6c00 6f00 2000  ,. .h.e.l.l.o. .
00001970: 4200 6100 7400 6d00 6100 6e00 2e00 2e00  B.a.t.m.a.n.....
00001980: 2e00 0a00 0000 0000 4900 2000 7300 7500  ........I. .s.u.
00001990: 7000 6500 7200 2000 6800 6100 7400 6500  p.e.r. .h.a.t.e.
000019a0: 2000 7900 6f00 7500 2000 7200 6900 6700   .y.o.u. .r.i.g.
000019b0: 6800 7400 2000 6e00 6f00 7700 2e00 0a00  h.t. .n.o.w.....
000019c0: 0000 0000 5700 6800 6100 7400 2000 6900  ....W.h.a.t. .i.
000019d0: 7300 2000 7400 6800 6500 2000 7000 6100  s. .t.h.e. .p.a.
000019e0: 7300 7300 7700 6f00 7200 6400 3f00 0a00  s.s.w.o.r.d.?...
000019f0: 0000 0000 2500 3100 3500 6c00 7300 0000  ....%.1.5.l.s...
00001a00: 4700 6f00 2000 7300 7400 6500 7000 2000  G.o. .s.t.e.p. .
00001a10: 6f00 6e00 2000 6100 2000 6200 7200 6900  o.n. .a. .b.r.i.
00001a20: 6300 6b00 2100 0a00 0000 0000 4f00 6800  c.k.!.......O.h.
00001a30: 2000 6c00 6f00 6f00 6b00 2000 6100 2000   .l.o.o.k. .a. .
00001a40: 7200 6100 6900 6e00 6200 6f00 7700 2e00  r.a.i.n.b.o.w...
00001a50: 0a00 0000 4500 7600 6500 7200 7900 7400  ....E.v.e.r.y.t.
00001a60: 6800 6900 6e00 6700 2000 6900 7300 2000  h.i.n.g. .i.s. .
00001a70: 6100 7700 6500 7300 6f00 6d00 6500 2100  a.w.e.s.o.m.e.!.
00001a80: 0a00 0000 2500 7300 2000 3d00 3e00 2000  ....%.s. .=.>. .
00001a90: 2500 7300 0a00 0000 0000 0000 0000 0000  %.s.............
```

Well this is interesting! If you are familiar with how strings are stored in C, you will know that `0x00` ends a string. The program `strings` uses this and the ASCII range to search for strings in binary files. The strings above do not follow this pattern and thus would not have been found if I had even thought to try it out (without some flags to make it look for two byte wide characters). Instead, each character is followed by a null byte and it takes two null bytes to end a string. Now that I was aware of this, I kept scrolling through the file and found more text later.

```text
00002aa0: 0500 4200 5200 4900 4300 4b00 0000 0000  ..B.R.I.C.K.....
00002ab0: 3800 4500 7400 6d00 6300 3000 4400 4100  8.E.t.m.c.0.D.A.
00002ac0: 4600 3800 5100 7600 0000 0000 0000 0000  F.8.Q.v.........
```

Manually extracting `8Etmc0DAF8Qv` from this string and providing it as the password when running the program told me that I was on the right track. This was the password! Of course, each file has a different password.

```text
C:\Users\Gerrit\Downloads\FLEGGO\FLEGGO>y77GmQGdwVL7Fc9mMdiLJMgFQ8rgeSrl.exe
What is the password?
8Etmc0DAF8Qv
Everything is awesome!
12268605.png => s
```

Getting the right password creates a file named `########.png` in the current directory. It took me far *far* too long to notice this.

Before writing a script to extract the passwords, I decided to `diff` two of the files to see if anything else interesting popped up.

```bash
$ diff --suppress-common-lines -y <(xxd 1BpnGjHOT7h5vvZsV4vISSb60Xj3pX5G.exe) <(xxd dT4Xze8paLOG7srCdGLsbLE1s6m3EsfX.exe) | less
```

Doing this revealed that the password strings were at the exact same location in each file, which makes extracting the passwords with a script much simpler. I threw together a bit of python to extract the password, run each program, and grab the output.

```python3
import glob
from subprocess import PIPE, run
import os

root = 0x2ab0
end_str = b'\0\0'

files = []
passwords = []
outputs = []

for f in glob.glob('*.exe'):
    files.append(f)
    with open(f, 'rb') as a:
        bytes = a.read()
        i = 0
        while True:
            if bytes[root + i:root + i + len(end_str)] == end_str:
                break
            i += 2
        passwords.append(bytes[root : root + i].decode('ascii').replace('\0', ''))

for f, p in zip(files, passwords):
    out = run(f, input=p + '\n', encoding='ascii', stdout=PIPE).stdout
    outputs.append(out.replace('What is the password?\nEverything is awesome!', '').strip())

print ('{:36} | {:16} | {}'.format('File', 'Password', 'Output'))
s = sorted(zip(files, passwords, outputs), key=lambda x: x[2])

for f, p, o in s:
    print ('{:36} | {:16} | {}'.format(f, p, o))
```

Running this script gives the following output:

```text
File                                 | Password         | Output
y77GmQGdwVL7Fc9mMdiLJMgFQ8rgeSrl.exe | 8Etmc0DAF8Qv     | 12268605.png => s
HDHugJBqTJqKKVtqi3sfR4BTq6P5XLZY.exe | 45psrewIRS       | 13147895.png => w
dnAciAGVdlovQFSJmNiPOdHjkM3Ji18o.exe | ZYNGeumv6QuI7    | 15566524.png => e
gFZw7lPUlbOXBvHRc31HJI5PKwy745Wv.exe | jZAorSlICuQa0g8  | 16295588.png => a
4ihY3RWK4WYqI4XOXLtAH6XV5lkoIdgv.exe | 3nEiXqMnXG       | 16544936.png => e
iJO15JsCa1bV5anXnZ9dTC9iWbEDmdtf.exe | 2LUmPSYdxDcil    | 16785906.png => 4
d4NlRo5umkvWhZ2FmEG32rXBNeSSLt2Q.exe | 5xj9HmHyhF       | 18309310.png => @
BG3IDbHOUt9yHumPceLTVbObBHFneYEu.exe | KSL8EAnlIZin1gG  | 18376743.png => _
xyjJcvGAgswB7Yno5e9qLF4i13L1iGoT.exe | gNbeYAjn         | 19343964.png => o
JXADoHafRHDyHmcTUjEBOvqq95spU7sj.exe | jZRmFmeIchneGS   | 30171375.png => s
lk0SOpnVIzTcC1Dcou9R7prKAC3laX0k.exe | 9eDMpbMSEeZ      | 33098947.png => _
MrA1JmEDfPhnTi5MNMhqVS8aaTKdxbMe.exe | auDB6HtMv        | 33662866.png => r
eovBHrlDb809jf08yaAcSzcX4T37F1NI.exe | rXZE7pDx3        | 33718379.png => .
u8mbI3GZ8WtwruEiFkIl0UKxJS917407.exe | r6ZWNWeFadW      | 36494753.png => 0
Bl0Iv5lT6wkpVCuy7jtcva7qka8WtLYY.exe | uLKEIRAEn        | 36870498.png => m
JIdE7SESzC1aS58Wwe5j3i6XbpkCa3S6.exe | goTZP4go         | 37723511.png => n
Ew93SSPDbgiQYo4E4035A16MJUxXegDW.exe | eoneTNuryZ3eF    | 42255131.png => t
jJHgJjbyeWTTyQqISuJMpEGgE1aFs5ZB.exe | 9aIZjTerf0       | 44958449.png => _
zRx3bsMfOwG8IaayOeS8rHSSpiRfc9IB.exe | XgkvZJKe         | 47202222.png => n
Bp7836noYu71VAWc27sUdfaGwieALfc2.exe | NcMkqwelbRu      | 47619326.png => p
NaobGsJ2w6qqblcIsj4QYNIBQhg3gmTR.exe | C446Zdun         | 47893007.png => _
wmkeAU8MdYrC9tEUMHH2tRMgaGdiFnga.exe | 0rhvT5GX         | 51227743.png => a
xatgydl5cadiWFY4EXMRuoQr22ZIRC1Y.exe | 8V9AzigUcb2J     | 52817899.png => n
AEVYfSTJwubrlJKgxV8RAl0AdZJ5vhhy.exe | UkuAJxmt8        | 58770751.png => o
E36RGTbCE4LDtyLi97l9lSFoR7xVMKGN.exe | dPVLAQ8LwmhH     | 60075496.png => s
P2PxxSJpnquBQ3xCvLoYj4pD3iyQcaKj.exe | nLSGJ2BdwC       | 61006829.png => l
hajfdokqjogmoWfpyp4w0feoeyhs1QLo.exe | hqpNm7VJL        | 61333226.png => f
w3Y5YeglxqIWstp1PLbFoHvrQ9rN3F3x.exe | HQG0By9q         | 63223880.png => a
aSfSVMn7B8eRtxgJgwPP5Y5HiDEidvKg.exe | b1VRfMTNPu       | 64915798.png => 3
1BpnGjHOT7h5vvZsV4vISSb60Xj3pX5G.exe | ZImIT7DyCMOeF6   | 65141174.png => w
SeDdxvPJFHCr7uoQMjwmdRBAYEelHBZB.exe | ohj5W6Goli       | 65626704.png => 3
7mCysSKfiHJ4WqH2T8ERLE33Wrbp6Mqe.exe | Q9WdIAGjUKdNxr6  | 67322218.png => _
2AljFfLleprkThTHuVvg63I7OgjG2LQT.exe | UvCG4jaaIc4315   | 67782682.png => m
cWvFLbliUfJl7KFDUYF1ABBFYFb6FJMz.exe | yu7hNshnpM4Vy    | 70037217.png => m
eEJhUoNbuc40kLHRo8GB7bwFPkuhgaVN.exe | J1kj42jZsC9      | 71290032.png => a
K7HjR3Hf10SGG7rgke9WrRfxqhaGixS0.exe | Z8VCO7XbKUk      | 72263993.png => h
bmYBZTBJlaFNbbwpiOiiQVdzimx8QVTI.exe | 7kcuVMWeIBFGWfJ  | 72501159.png => c
u3PL12jk5jCZKiVm0omvh46yK7NDfZLT.exe | 4z0gAyKdk        | 72562746.png => -
x4neMBrqkYIQxDuXpwJNQZOlfyfA0eXs.exe | Fs3Ogu6W3qk59kZ  | 73903128.png => u
3Jh0ELkck1MuRvzr8PLIpBNUGlspmGnu.exe | uVmH96JGdPkEBfd  | 75072258.png => r
v6RkHsLya4wTAh71C65hMXBsTc1ZhGZT.exe | dEDDxJaxc1R      | 79545849.png => s
IXITujCLucnD4P3YrXOud5gC7Bwcw6mr.exe | aGUwVeVZ2c19mgE  | 80333569.png => o
dT4Xze8paLOG7srCdGLsbLE1s6m3EsfX.exe | dRnTVwZPjf0U     | 82100368.png => m
kGQY35HJ7gvXzDJLWe8mabs3oKpwCo6L.exe | 14bm9pHvbufOA    | 82236857.png => e
1JpPaUMynR9GflWbxfYvZviqiCB59RcI.exe | PylRCpDK         | 85934406.png => m
SDIADRKhATsagJ3K8WwaNcQ52708TyRo.exe | 5O2godXTZePdWZd  | 87730986.png => 0
azcyERV8HUbXmqPTEq5JFt7Ax1W5K4wl.exe | qNb6tr7n         | 88763595.png => e
PvlqINbYjAY1E4WFfc2N6rZ2nKVhNZTP.exe | 0d7qdvEhYGc      | 89295012.png => 0
```

I played with this for quite a while, trying different sorting methods and eventually even trying to determine the password by hand before noticing the `.png` files in my directory. Once I noticed these, the challenge was trivial. Each image contains a number in the top left corner which is obviously an index, and the Python script already gave me the letter at that index.

Fifteen minutes later, I submitted the flag `mor3_awes0m3_th4n_an_awes0me_p0ssum@flare-on.com`.

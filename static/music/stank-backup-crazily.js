const files = {
  "a_familiar_room.ogg": "c1c3b7233b080ffc17389af8b68a46b2df798ef1",
  "aerie.ogg": "6615ab7f668384cf98b0cb034ce8e4c52eaf86b2",
  "an_ordinary_day.ogg": "fb47d8c0ba3756e2c5066fcd865e866fa209ae2d",
  "ancestry.ogg": "868c7a7c4d9358d631fa2f9abfc6bbf05d88292d",
  "axolotl.ogg": "ee92e4ed79b3c4c47eabe71b36375b5d3f05b017",
  "ballad_of_the_cats.ogg": "e2ee9a161e2d6ea2452e5320edf8b4b01b63e350",
  "beginning_2.ogg": "87722a59c8d488370f3d430cd4c97a3161081785",
  "blind_spots.ogg": "591f41a2c5f53bcc60d7ded982fe29e76223a8ca",
  "blocks.ogg": "9b2a01e0d0456b8fbe33557fbc19d4fe342f94d6",
  "boss.ogg": "b9eef13c2337a6335c4523858619ca560dff4496",
  "bromeliad.ogg": "62171ee4d5ed33a224c59f985a6b304860523b17",
  "cat.ogg": "d1eb3d2e39bf1f6289cfcbca44e1c9bb508b20f0",
  "chirp.ogg": "ec8a2cbdf68b4e2136098ec33695e1c53625ddb8",
  "chrysopoeia.ogg": "eb065c510ad0810a1096f04c2a6fe692c415bc88",
  "clark.ogg": "74da65c99aa578486efa7b69983d3533e14c0d6e",
  "comforting_memories.ogg": "cab779f1a15d9fe49bcc975d077717ebd1f87cda",
  "concrete_halls.ogg": "71cc853556f7ca5784c9e9fc8e0bd6778d13027b",
  "creative4.ogg": "4664de25eb2bfc88ebbd638cfae6934dd968ceaa",
  "credits.ogg": "27fcacc68bb77f01b23ea9c9d36d9018f8509cdf",
  "crescent_dunes.ogg": "a0ad97718ec427d5651ef602331ebda9c91bc906",
  "danny.ogg": "5e7d63e75c6e042f452bc5e151276911ef92fed8",
  "dead_voxel.ogg": "5a7ce2181203dd558cbd55d02081b9e95a07f16f",
  "dragon_fish.ogg": "6be4491a5d1a5f0dd68fb36c310ecfe3501cafe1",
  "dreiton.ogg": "45cb6cbbff2d7fc1daefbd85b031fd9dcfc70e7b",
  "echo_in_the_wind.ogg": "a40303dd9d4bfbb0986e66fc93553a0755621880",
  "end.ogg": "47800737d078e751698df291054adc596ba8195a",
  "far.ogg": "f46c38e7d6d7b19d5d68aa18b557215738deb36a",
  "firebugs.ogg": "352bc5b46e08effbb8d92298b601e688cc36c4de",
  "floating_dream.ogg": "45bdfe06cc8c375dc507e59527c9a89105980085",
  "floating_trees.ogg": "15f38314274e759c44f50ac641d11bde12474a25",
  "haggstrom.ogg": "dd85fb564e96ee2dbd4754f711ae9deb08a169f9",
  "haunt_muskie.ogg": "4f8c3f9b4f290f63c78bf3bbaad16906a3ccff29",
  "infinite_amethyst.ogg": "c9c4d7988a578eccfc31cb2f04defc40d71ef719",
  "labyrinthine.ogg": "b83bbafa9799680da24f10215de2c40b73ce1fe3",
  "left_to_bloom.ogg": "aa1d3aace1c481ac32d5827fba287294b6bc99fb",
  "living_mice.ogg": "ceaaaa1d57dfdfbb0bd4da5ea39628b42897a687",
  "mall.ogg": "83233451430516d839eaee855a2f789b8985d457",
  "mice_on_venus.ogg": "9528b6a76e7bac64ca1145cc682e8a8448cc04e5",
  "minecraft.ogg": "50a59a4f56e4046701b758ddbb1c1587efa4cadf",
  "moog_city_2.ogg": "783ddccf4681a0c50d3e651f4e6ac27a0f4ea76f",
  "mutation.ogg": "c157c56846f0e50620f808fecd9d069423dd6c41",
  "one_more_day.ogg": "8b0b49dcab54157bb02ef81380990dac2a187b99",
  "otherside.ogg": "a5effd79795773422bb4de85841838f3ad9c216d",
  "pigstep.ogg": "9ffb1791e8aba8f266a673abec1846c3bf8fb8cc",
  "relic.ogg": "f6c8af3b270a609b12eddd4a56fe2139662782e8",
  "rubedo.ogg": "473768ad0df67d518b3bd4cfe1c380d6d84bddbf",
  "shuniji.ogg": "fd8db6a4ceb400e6abafb2a6b3ac53d871910b42",
  "so_below.ogg": "574ee01c1617c1cd9d2111822637f3da9d5a34f0",
  "stal.ogg": "2c4f3f8f259dc782867727311fea30875ecc3917",
  "stand_tall.ogg": "5b3ae419f7f7648568f0b5303594078aea12f598",
  "strad.ogg": "f34afa3ba5f756e90a1f61023bbe069ee8442608",
  "subwoofer_lullaby.ogg": "df1ff11b79757432c5c3f279e5ecde7b63ceda64",
  "sweden.ogg": "14ae57a6bce3d4254daa8be2b098c2d99743cc3f",
  "taswell.ogg": "6254527d626a2c7d80901cc2e62dce3ba4bd81f6",
  "wait.ogg": "876655d1691803f4cef17a6288d971285be79c6a",
  "ward.ogg": "f685021d4f26d6b590bffb341908e25e92e18cef",
  "warmth.ogg": "b0b12118a97ddd733a50e9382e91a21652568641",
  "wending.ogg": "5dd32ce63e2ff412c0c1009255e944fae80b03b0",
};

const PREFIX = "stank-backup-crazily/";

const $tracks = document.getElementById("tracks");
const $player = document.getElementById("player");

const options = {
  shuffle: localStorage.getItem(PREFIX + "shuffle") === "true",
};

const $audio = $player.appendChild(document.createElement("audio"));
$audio.controls = true;
$audio.addEventListener("ended", playNext);

const $nowPlaying = $player.appendChild(document.createElement("div"));
$nowPlaying.textContent = "Playing: Nothing...";

const $controls = $player.appendChild(document.createElement("div"));
$controls.classList.add("options");
const next = $controls.appendChild(document.createElement("button"));
next.textContent = "Next";
next.addEventListener("click", playNext);

const $options = $player.appendChild(document.createElement("div"));
$options.classList.add("options");

const $shuffle = $options.appendChild(document.createElement("label"));
const $shuffleCheck = $shuffle.appendChild(document.createElement("input"));
$shuffleCheck.type = "checkbox";
$shuffleCheck.addEventListener("input", () => {
  options.shuffle = $shuffleCheck.checked;
  localStorage.setItem(PREFIX + "shuffle", options.shuffle);
});
$shuffleCheck.checked = options.shuffle;
$shuffle.append(document.createTextNode("Shuffle"));

function playNext() {
  let nextIndex;
  const currentIndex = Array.from($tracks.children).indexOf(document.querySelector(".track.current"));
  if (options.shuffle) {
    do {
      nextIndex = Math.floor(Math.random() * $tracks.childElementCount);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = currentIndex + 1;
    nextIndex %= $tracks.childElementCount;
  }

  $tracks.scrollTop = Math.max(0, (nextIndex - 1) * 30.5);
  playTrack($tracks.children[nextIndex].dataset.hash);
}

function playTrack(hash) {
  $audio.src = `/music/${hash}.ogg`;
  $audio.autoplay = true;
  $audio.currentTime = 0;
  $audio.play();

  const name = Object.entries(files).find((x) => x[1] === hash);
  $nowPlaying.textContent = `Playing: ${name[0]}`;

  document.querySelector(".track.current")?.classList.remove("current");
  const current = document.querySelector(`.track[data-hash="${hash}"]`);
  current.classList.add("current");
}

for (const [name, hash] of Object.entries(files)) {
  const el = $tracks.appendChild(document.createElement("div"));
  el.classList.add("track");
  el.dataset.hash = hash;
  el.addEventListener("click", () => {
    playTrack(hash);
  });

  const del = el.appendChild(document.createElement("button"));
  del.classList.add("delete");
  del.textContent = "x";
  del.addEventListener("click", () => {
    el.remove();
  });

  const display = el.appendChild(document.createElement("span"));
  display.textContent = name;
}

const { createMultiVoteGame } = require("./factory-multi-vote");

module.exports = createMultiVoteGame({
  id: "pitch-panic",
  submitPhaseId: "pitch-write",
  votePhaseId: "pitch-vote",
  revealPhaseId: "pitch-reveal",
  submitSeconds: 35,
  voteSeconds: 25,
  maxLength: 220,
  fieldLabel: "შენი პიჩი",
  fallbackPrefix: "ავტოპიჩი",
  categories: [
    { id: "convincing", label: "ყველაზე დამაჯერებელი", points: 260 },
    { id: "funny", label: "ყველაზე სასაცილო", points: 220 },
    { id: "cursed", label: "ყველაზე დაწყევლილი", points: 240 },
  ],
  hostTitles: {
    submit: "ინვესტორები შემოდიან",
    vote: "ვინ მოიგებს დარბაზს?",
    reveal: "ინვესტორთა განაჩენი",
  },
  getMedia(room, current) {
    return {
      kind: "text",
      label: "დღის იდეა",
      title: current.item.title,
      text: current.item.prompt,
    };
  },
  getHostSubmitNote(room, current) {
    return `${current.item.goal}. ყველა წერს მოკლე გასაყიდ ტექსტს.`;
  },
  getHostVoteNote(room) {
    return "ხმა ცალ-ცალკე მიეცით სამ კატეგორიაში.";
  },
  getHostRevealNote() {
    return "თუ ერთმა პიჩმა რამდენიმე კატეგორია მოიგო, ის დამატებით ბონუსს იღებს.";
  },
  getPlayerSubmitTitle() {
    return "დაარწმუნე უცნობი ინვესტორი";
  },
  getPlayerSubmitNote(room, participant, current) {
    return `${current.item.goal}. მოიფიქრე ერთი მოკლე, მკაფიო და სასაცილო გაყიდვა.`;
  },
  getPlaceholder() {
    return "რატომ უნდა ჩადონ ფული ამ აბსურდში?";
  },
  getPlayerVoteTitle() {
    return "აირჩიე კატეგორიების გამარჯვებულები";
  },
  getPlayerRevealNote(room, participant, current) {
    const wins = Object.entries(current.voteBreakdown || {})
      .filter(([, breakdown]) => (breakdown[participant.id] || 0) > 0)
      .length;
    return wins > 1 ? "რამდენიმე კატეგორიაში ხმები აიღე." : "შემდეგ რაუნდში კიდევ უფრო ხმაურიანი გაყიდვა დაგჭირდება.";
  },
  afterVote(room, deltas, breakdown) {
    const winCounts = {};
    room.players.forEach((player) => {
      winCounts[player.id] = 0;
    });

    Object.values(breakdown).forEach((categoryVotes) => {
      const top = Object.entries(categoryVotes).sort((left, right) => right[1] - left[1])[0];
      if (top && winCounts[top[0]] !== undefined) {
        winCounts[top[0]] += 1;
      }
    });

    Object.entries(winCounts).forEach(([playerId, count]) => {
      if (count >= 2) deltas[playerId] += 180;
      if (count === 3) deltas[playerId] += 160;
    });
  },
});

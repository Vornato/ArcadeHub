const { createMultiVoteGame } = require("./factory-multi-vote");

module.exports = createMultiVoteGame({
  id: "survive-scenario",
  submitPhaseId: "scenario-write",
  votePhaseId: "scenario-vote",
  revealPhaseId: "scenario-reveal",
  submitSeconds: 42,
  voteSeconds: 25,
  maxLength: 200,
  fieldLabel: "შენი გეგმა",
  fallbackPrefix: "ავტოგეგმა",
  categories: [
    { id: "smart", label: "ყველაზე ჭკვიანური", points: 260 },
    { id: "funny", label: "ყველაზე სასაცილო", points: 220 },
    { id: "chaos", label: "ყველაზე ქაოსური", points: 240 },
  ],
  hostTitles: {
    submit: "გადარჩენის ფანჯარა ღიაა",
    vote: "ვის ენდობი კრიზისში?",
    reveal: "გადარჩენის შედეგები",
  },
  getMedia(room, current) {
    return {
      kind: "text",
      label: current.item.title,
      title: "სიტუაცია",
      text: current.item.prompt,
    };
  },
  getHostSubmitNote(room, current) {
    return `${current.item.goal}. ყველამ დაწეროს ერთი ან ორი წინადადება.`;
  },
  getHostVoteNote() {
    return "კატეგორიები ერთმანეთისგან დამოუკიდებელია.";
  },
  getHostRevealNote() {
    return "თუ ერთი გეგმა ერთდროულად რამდენიმე კატეგორიაში ლიდერობს, მეტი ქულა მოდის.";
  },
  getPlayerSubmitTitle() {
    return "გადაარჩინე თავი და ღირსება";
  },
  getPlayerSubmitNote(room, participant, current) {
    return `${current.item.goal}. შენს გეგმას დიდი ახსნა არ სჭირდება, მხოლოდ კარგი მიმართულება.`;
  },
  getPlaceholder() {
    return "როგორ გამოხვალ ამ აბსურდიდან?";
  },
  getPlayerVoteTitle() {
    return "ვის გეგმას გაყვებოდი?";
  },
  getPlayerRevealNote(room, participant, current) {
    const ownText = current.entries[participant.id]?.text || "";
    return ownText ? `შენი გეგმა: ${ownText}` : "ამ რაუნდში პასუხი არ დარეგისტრირდა.";
  },
  afterVote(room, deltas, breakdown) {
    const winCounts = {};
    room.players.forEach((player) => {
      winCounts[player.id] = 0;
    });

    Object.values(breakdown).forEach((categoryVotes) => {
      const sorted = Object.entries(categoryVotes).sort((left, right) => right[1] - left[1]);
      if (!sorted.length) return;
      const maxVotes = sorted[0][1];
      sorted.filter((entry) => entry[1] === maxVotes).forEach(([playerId]) => {
        winCounts[playerId] += 1;
      });
    });

    Object.entries(winCounts).forEach(([playerId, count]) => {
      if (count >= 2) deltas[playerId] += 200;
      if (count === 3) deltas[playerId] += 220;
    });
  },
});

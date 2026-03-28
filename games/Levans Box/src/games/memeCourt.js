const { createMultiVoteGame } = require("./factory-multi-vote");
const { shuffle } = require("../utils");

module.exports = createMultiVoteGame({
  id: "meme-court",
  submitPhaseId: "court-write",
  votePhaseId: "court-vote",
  revealPhaseId: "court-reveal",
  submitSeconds: 40,
  voteSeconds: 24,
  maxLength: 180,
  fieldLabel: "შენი არგუმენტი",
  fallbackPrefix: "ავტოარგუმენტი",
  categories: [
    { id: "strong", label: "ყველაზე ძლიერი", points: 280 },
    { id: "funny", label: "ყველაზე სასაცილო", points: 220 },
  ],
  hostTitles: {
    submit: "სასამართლო იხსნება",
    vote: "მოსამართლე დარბაზი",
    reveal: "სასამართლოს ვერდიქტი",
  },
  assignRoles(room) {
    const sides = shuffle(["დაცვა", "ბრალდება"]);
    return Object.fromEntries(room.players.map((player, index) => [player.id, sides[index % sides.length]]));
  },
  getMedia(room, current) {
    return {
      kind: "text",
      label: current.item.title,
      title: "საქმის აღწერა",
      text: current.item.prompt,
    };
  },
  getEntryLabel(room, participant, current) {
    return current.roles[participant.id];
  },
  hostRoleNote(room, current) {
    const counts = room.players.reduce((memo, player) => {
      const side = current.roles[player.id];
      memo[side] = (memo[side] || 0) + 1;
      return memo;
    }, {});
    return `დაცვა: ${counts["დაცვა"] || 0} | ბრალდება: ${counts["ბრალდება"] || 0}`;
  },
  getHostSubmitNote(room, current) {
    return `საქმე ეხება ${current.item.character}-ს. მოთამაშეები წერენ მოკლე დაცვის ან ბრალდების ტექსტს.`;
  },
  getHostVoteNote() {
    return "ხმა მიეცით საუკეთესო და ყველაზე სასაცილო არგუმენტს.";
  },
  getHostRevealNote() {
    return "თუ ნაკლებმოთამაშიანმა მხარემ მოიგო დარბაზი, ბონუსს იღებს.";
  },
  getPlayerSubmitTitle(room, participant, current) {
    return current.roles[participant.id] === "დაცვა" ? "დაიცავი ბრალდებული" : "დაადანაშაულე ბრალდებული";
  },
  getPlayerSubmitNote(room, participant, current) {
    return `${current.roles[participant.id]}: დაწერე ერთი მოკლე, მკაფიო და სასაცილო არგუმენტი.`;
  },
  getPlaceholder(room, participant, current) {
    return current.roles[participant.id] === "დაცვა" ? "რატომ არ არის დამნაშავე?" : "რატომ უნდა დაისაჯოს?";
  },
  getPlayerVoteTitle() {
    return "ვინ იმსახურებს დარბაზს?";
  },
  getPlayerRevealNote(room, participant, current) {
    return `შენი მხარე იყო: ${current.roles[participant.id]}.`;
  },
  afterVote(room, deltas, breakdown) {
    const sideSizes = room.players.reduce((memo, player) => {
      const side = room.gameState.current.roles[player.id];
      memo[side] = (memo[side] || 0) + 1;
      return memo;
    }, {});

    const sideScores = room.players.reduce((memo, player) => {
      const side = room.gameState.current.roles[player.id];
      const scoreFromVotes = Object.values(breakdown).reduce((sum, categoryVotes) => sum + (categoryVotes[player.id] || 0), 0);
      memo[side] = (memo[side] || 0) + scoreFromVotes;
      return memo;
    }, {});

    const minoritySide = (sideSizes["დაცვა"] || 0) <= (sideSizes["ბრალდება"] || 0) ? "დაცვა" : "ბრალდება";
    const otherSide = minoritySide === "დაცვა" ? "ბრალდება" : "დაცვა";
    if ((sideScores[minoritySide] || 0) > (sideScores[otherSide] || 0)) {
      room.players
        .filter((player) => room.gameState.current.roles[player.id] === minoritySide)
        .forEach((player) => {
          deltas[player.id] += 220;
        });
    }
  },
});

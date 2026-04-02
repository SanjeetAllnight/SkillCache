function getTestMessage(_req, res) {
  res.status(200).send("API working");
}

module.exports = {
  getTestMessage,
};

const { v4: uuid } =
    require("uuid");

module.exports = () => {
    return `mount:${uuid()}`;
};
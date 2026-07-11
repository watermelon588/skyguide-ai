const observationService = require("../services/observationService");

/**
 * Observation planner controller (thin).
 *
 * Derives userId from the authenticated request (never the body), delegates
 * all logic to observationService, and shapes the { success, message, data }
 * response. Service-thrown 4xx errors bubble to the global handler via next().
 */

// GET /api/v1/observations?status=planned — the user's list.
exports.listObservations = async (req, res, next) => {
  try {
    const observations = await observationService.listObservations(
      req.user._id,
      { status: req.query.status }
    );

    res.status(200).json({
      success: true,
      message: `${observations.length} observation(s) retrieved.`,
      data: { count: observations.length, observations },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/observations — plan an object.
exports.addObservation = async (req, res, next) => {
  try {
    const observation = await observationService.addObservation(
      req.user._id,
      req.body
    );

    res.status(201).json({
      success: true,
      message: `${observation.catalog_id} added to your observation plan.`,
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/observations/:id — status / notes / priority.
exports.updateObservation = async (req, res, next) => {
  try {
    const observation = await observationService.updateObservation(
      req.user._id,
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Observation updated.",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/observations/:id — remove from the plan/history.
exports.removeObservation = async (req, res, next) => {
  try {
    const observation = await observationService.removeObservation(
      req.user._id,
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: `${observation.catalog_id} removed.`,
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

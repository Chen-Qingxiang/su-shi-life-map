(function (app) {
  const asArray = (value) => Array.isArray(value) ? value : [];
  const supplementalVisits = () => window.suShiJourneyVisitsChapters414?.features || [];
  const supplementalSegments = () => window.suShiJourneySegmentsChapters414?.features || [];
  const supplementalWorks = () => asArray(window.suShiJourneyWorksChapters414);

  const baseGetJourneys = app.getJourneys;
  app.getJourneys = function getJourneys() {
    return [...asArray(baseGetJourneys?.()), ...asArray(window.suShiJourneysChapters414)];
  };

  const baseGetJourneyWorks = app.getJourneyWorks;
  app.getJourneyWorks = function getJourneyWorks(journeyId) {
    return [
      ...asArray(baseGetJourneyWorks?.(journeyId)),
      ...supplementalWorks().filter((work) => work.journey_id === journeyId)
    ];
  };

  const baseGetJourneyWorksForVisit = app.getJourneyWorksForVisit;
  app.getJourneyWorksForVisit = function getJourneyWorksForVisit(visitId) {
    return [
      ...asArray(baseGetJourneyWorksForVisit?.(visitId)),
      ...supplementalWorks().filter((work) => work.visit_id === visitId)
    ];
  };

  const baseGetJourneyVisitById = app.getJourneyVisitById;
  app.getJourneyVisitById = function getJourneyVisitById(visitId) {
    const base = baseGetJourneyVisitById?.(visitId);
    if (base) return base;
    const feature = supplementalVisits().find((item) => item.properties?.visit_id === visitId);
    if (!feature) return null;
    const [lon, lat] = feature.geometry.coordinates;
    return { ...feature.properties, lat, lon };
  };

  const baseGetJourneyMapData = app.getJourneyMapData;
  app.getJourneyMapData = function getJourneyMapData(journeyId) {
    const base = baseGetJourneyMapData?.(journeyId) || {
      visits: [],
      segments: { type: "FeatureCollection", features: [] }
    };
    const visits = supplementalVisits()
      .filter((feature) => feature.geometry?.type === "Point" && feature.properties?.journey_id === journeyId)
      .map((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        return { ...feature.properties, lat, lon };
      })
      .sort((a, b) => a.order - b.order);
    if (!visits.length) return base;
    return {
      visits,
      segments: {
        type: "FeatureCollection",
        features: supplementalSegments().filter((feature) => feature.properties?.journey_id === journeyId)
      }
    };
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});

(function (app) {
  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqueById(items, idField) {
    const seen = new Set();
    return items.filter((item) => {
      const id = item[idField];
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  function getLifeStops() {
    const lifeLocations = window.suShiLifeLocations || { features: [] };
    return asArray(lifeLocations.features)
      .filter((feature) => feature.geometry?.type === "Point" && feature.properties?.kind === "stop")
      .map((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        return { ...feature.properties, lat, lon };
      });
  }

  app.getPeople = function getPeople() {
    return asArray(window.suShiPeople);
  };

  app.getRelations = function getRelations() {
    return asArray(window.suShiRelations);
  };

  app.getEvents = function getEvents() {
    return asArray(window.suShiEvents);
  };

  app.getWorks = function getWorks() {
    return asArray(window.suShiWorks);
  };

  app.getJourneys = function getJourneys() {
    return asArray(window.suShiJourneys);
  };

  app.getJourneyById = function getJourneyById(journeyId) {
    return app.getJourneys().find((journey) => journey.journey_id === journeyId) || null;
  };

  app.getJourneyWorks = function getJourneyWorks(journeyId) {
    return asArray(window.suShiJourneyWorks).filter((work) => work.journey_id === journeyId);
  };

  app.getJourneyWorksForVisit = function getJourneyWorksForVisit(visitId) {
    return asArray(window.suShiJourneyWorks).filter((work) => work.visit_id === visitId);
  };

  app.getJourneyVisitById = function getJourneyVisitById(visitId) {
    const features = window.suShiJourneyVisits?.features || [];
    const feature = features.find((item) => item.properties?.visit_id === visitId);
    if (!feature) return null;
    const [lon, lat] = feature.geometry.coordinates;
    return { ...feature.properties, lat, lon };
  };

  app.getPersonById = function getPersonById(personId) {
    return app.getPeople().find((person) => person.person_id === personId) || null;
  };

  app.getRelationById = function getRelationById(relationId) {
    return app.getRelations().find((relation) => relation.relation_id === relationId) || null;
  };

  app.getEventById = function getEventById(eventId) {
    return app.getEvents().find((event) => event.event_id === eventId) || null;
  };

  app.getWorkById = function getWorkById(workId) {
    return app.getWorks().find((work) => work.work_id === workId) || null;
  };

  app.getPlaceByKey = function getPlaceByKey(placeKey) {
    return getLifeStops().find((place) => place.place_key === placeKey) || null;
  };

  app.getRelationsForPerson = function getRelationsForPerson(personId) {
    return app.getRelations().filter((relation) => relation.source_person_id === personId || relation.target_person_id === personId);
  };

  app.getEventsForPlace = function getEventsForPlace(placeKey) {
    return app.getEvents().filter((event) => event.place_key === placeKey);
  };

  app.getWorksForPlace = function getWorksForPlace(placeKey) {
    const eventIds = new Set(app.getEventsForPlace(placeKey).map((event) => event.event_id));
    return app.getWorks().filter((work) => work.place_key === placeKey || eventIds.has(work.event_id));
  };

  app.getPeopleForPlace = function getPeopleForPlace(placeKey) {
    const personIds = new Set();

    app.getPeople().forEach((person) => {
      if (asArray(person.related_place_keys).includes(placeKey)) {
        personIds.add(person.person_id);
      }
    });

    app.getEventsForPlace(placeKey).forEach((event) => {
      asArray(event.people).forEach((personId) => personIds.add(personId));
    });

    app.getRelations().forEach((relation) => {
      if (asArray(relation.related_place_keys).includes(placeKey)) {
        personIds.add(relation.source_person_id);
        personIds.add(relation.target_person_id);
      }
    });

    return uniqueById(Array.from(personIds).map((personId) => app.getPersonById(personId)).filter(Boolean), "person_id");
  };

  app.getEventsForPerson = function getEventsForPerson(personId) {
    return app.getEvents().filter((event) => asArray(event.people).includes(personId));
  };

  app.getWorksForEvent = function getWorksForEvent(eventId) {
    return app.getWorks().filter((work) => work.event_id === eventId);
  };

  app.getWorksForPerson = function getWorksForPerson(personId) {
    const workIds = new Set();
    app.getEventsForPerson(personId).forEach((event) => {
      asArray(event.works).forEach((workId) => workIds.add(workId));
    });
    return uniqueById(Array.from(workIds).map((workId) => app.getWorkById(workId)).filter(Boolean), "work_id");
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});

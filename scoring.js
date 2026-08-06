/*
 * Puntentelling voor de NAC Breda voorspellingspool.
 *
 * De toto (1 = winst thuisploeg, 2 = winst uitploeg, 3 = gelijkspel) en de exacte score zijn
 * TWEE LOSSE voorspellingen die niet met elkaar hoeven te matchen (een deelnemer kan bewust
 * score 1-0 invullen maar toto 3, om zijn kansen te spreiden). Ze worden dus ook los beoordeeld:
 * 4 punten als de toto klopt met de werkelijke uitslag, +3 als de exacte eindstand ook klopt
 * (dus max. 7 punten per wedstrijd, en het is mogelijk om precies 3 of precies 4 te scoren).
 *
 * Bonusvragen: alles-of-niets. Zodra het juiste antwoord bekend is en in
 * data/bonusvragen.json is ingevuld, krijgt iedereen met een exact (hoofdletter-
 * en spatie-onafhankelijk) gelijk antwoord de bijbehorende punten.
 */

function bepaalUitslagType(scoreThuis, scoreUit) {
  if (scoreThuis > scoreUit) return "1"; // winst thuisploeg
  if (scoreThuis < scoreUit) return "2"; // winst uitploeg
  return "3"; // gelijkspel
}

function berekenWedstrijdPunten(voorspelling, wedstrijd) {
  if (!wedstrijd || !wedstrijd.gespeeld || !voorspelling) {
    return { punten: 0, totoGoed: false, exactGoed: false, gespeeld: false };
  }
  const werkelijkType = bepaalUitslagType(wedstrijd.score_thuis, wedstrijd.score_uit);

  // Los totoveld gebruiken; bij oudere inzendingen zonder los totoveld valt dit terug op de
  // toto die uit de ingevulde score zou volgen.
  const totoVoorspelling =
    voorspelling.toto !== undefined && voorspelling.toto !== null && voorspelling.toto !== ""
      ? String(voorspelling.toto)
      : bepaalUitslagType(voorspelling.score_thuis, voorspelling.score_uit);

  const totoGoed = totoVoorspelling === werkelijkType;
  const exactGoed =
    Number(voorspelling.score_thuis) === Number(wedstrijd.score_thuis) &&
    Number(voorspelling.score_uit) === Number(wedstrijd.score_uit);

  let punten = 0;
  if (totoGoed) punten += 4;
  if (exactGoed) punten += 3;

  return { punten, totoGoed, exactGoed, gespeeld: true };
}

function normaliseerTekst(tekst) {
  return (tekst || "").toString().trim().toLowerCase();
}

function berekenBonusPunten(antwoord, bonusvraag) {
  if (
    bonusvraag.juist_antwoord === null ||
    bonusvraag.juist_antwoord === undefined ||
    bonusvraag.juist_antwoord === ""
  ) {
    return { punten: 0, bekend: false, goed: false };
  }
  const goed = normaliseerTekst(antwoord) === normaliseerTekst(bonusvraag.juist_antwoord);
  return { punten: goed ? bonusvraag.punten : 0, bekend: true, goed };
}

function berekenTotaalDeelnemer(inschrijving, wedstrijden, bonusvragen) {
  let totaalWedstrijden = 0;
  let totaalBonus = 0;
  const detailsWedstrijden = {};
  const detailsBonus = {};

  wedstrijden.forEach(function (w) {
    const voorspelling = (inschrijving.voorspellingen || {})[w.id];
    const resultaat = berekenWedstrijdPunten(voorspelling, w);
    detailsWedstrijden[w.id] = resultaat;
    totaalWedstrijden += resultaat.punten;
  });

  bonusvragen.forEach(function (v) {
    const antwoord = (inschrijving.bonusantwoorden || {})[v.id];
    const resultaat = berekenBonusPunten(antwoord, v);
    detailsBonus[v.id] = resultaat;
    totaalBonus += resultaat.punten;
  });

  return {
    naam: inschrijving.naam,
    totaal: totaalWedstrijden + totaalBonus,
    totaalWedstrijden: totaalWedstrijden,
    totaalBonus: totaalBonus,
    detailsWedstrijden: detailsWedstrijden,
    detailsBonus: detailsBonus,
  };
}

function berekenTussenstand(inschrijvingen, wedstrijden, bonusvragen) {
  const resultaten = inschrijvingen.map(function (inschrijving) {
    return berekenTotaalDeelnemer(inschrijving, wedstrijden, bonusvragen);
  });
  resultaten.sort(function (a, b) {
    return b.totaal - a.totaal;
  });
  return resultaten;
}

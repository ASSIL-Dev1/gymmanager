/**
 * Recalcule l'etat d'une machine a partir de ses pannes et maintenances en cours :
 *   maintenance EN_COURS -> EN_MAINTENANCE ; sinon panne OUVERTE/EN_COURS -> EN_PANNE ; sinon DISPONIBLE.
 * Les etats HORS_SERVICE et MANQUANTE sont decides manuellement : ils ne sont jamais modifies ici.
 */
async function syncMachineEtat(client, machineId) {
  await client.query(
    `UPDATE machine m SET etat = CASE
        WHEN EXISTS (SELECT 1 FROM maintenance WHERE machine_id = m.id AND statut = 'EN_COURS')
          THEN 'EN_MAINTENANCE'
        WHEN EXISTS (SELECT 1 FROM panne WHERE machine_id = m.id AND statut IN ('OUVERTE', 'EN_COURS'))
          THEN 'EN_PANNE'
        ELSE 'DISPONIBLE' END
     WHERE m.id = $1 AND m.etat IN ('DISPONIBLE', 'EN_PANNE', 'EN_MAINTENANCE')`,
    [machineId]
  );
}

module.exports = { syncMachineEtat };

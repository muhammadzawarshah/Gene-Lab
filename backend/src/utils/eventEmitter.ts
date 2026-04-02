// src/utils/eventEmitter.ts
import { EventEmitter } from 'events';
const mqEmitter = new EventEmitter();

// In Production, this would push to RabbitMQ/Kafka
mqEmitter.on('GRN_COMPLETED', (payload) => {
  console.log(`[MQ EVENT]: GRN Created. Updating Reporting DB...`, payload);
  // Trigger Reporting Logic here
});

export default mqEmitter;
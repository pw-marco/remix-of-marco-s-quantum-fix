import NodeCache from "node-cache";

// Create a cache instance with a default TTL of 2 hours (7200 seconds)
// checkperiod: 600 seconds - automatically delete expired keys every 10 minutes
const cache = new NodeCache({
  stdTTL: 7200, // 2 hours in seconds
  checkperiod: 600, // cleanup expired keys every 10 minutes
  useClones: false, // better performance
});

export default cache;

module.exports = ({ config }) => {
  const baseUrl = process.env.VIZENTA_WEB_BASE_URL;
  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};

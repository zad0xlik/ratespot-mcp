FROM node:lts-alpine
WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm install --ignore-scripts

# copy source
COPY . .

# compile TypeScript project using tsconfig.json
RUN npx tsc --project tsconfig.json

# expose CSV file server port
EXPOSE 3001

# start MCP server
CMD ["node", "dist/ratespot_mcp_server.js"]

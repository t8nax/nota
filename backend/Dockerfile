# Контекст сборки — корень репозитория: версию SDK фиксирует global.json в корне.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json ./
COPY backend/src/Nota.Api/Nota.Api.csproj backend/src/Nota.Api/
RUN dotnet restore backend/src/Nota.Api/Nota.Api.csproj
COPY backend/src/Nota.Api/ backend/src/Nota.Api/
RUN dotnet publish backend/src/Nota.Api/Nota.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
EXPOSE 8080
ENTRYPOINT ["dotnet", "Nota.Api.dll"]

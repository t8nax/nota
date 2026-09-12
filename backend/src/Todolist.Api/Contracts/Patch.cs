using System.Text.Json;
using System.Text.Json.Serialization;

namespace Todolist.Api.Contracts;

/// <summary>
/// Поле частичного изменения: отличает «не передано» от «передано null».
/// Без этого различия PATCH со сменой отметки стирал бы срок, которого не касался.
/// </summary>
[JsonConverter(typeof(PatchJsonConverterFactory))]
public readonly struct Patch<T>
{
    private Patch(T? value)
    {
        IsSet = true;
        Value = value;
    }

    /// <summary>Было ли поле в теле запроса. У значения по умолчанию — false.</summary>
    public bool IsSet { get; }

    public T? Value { get; }

    public static Patch<T> Set(T? value) => new(value);

    /// <summary>Значение, если поле передано, иначе прежнее <paramref name="current"/>.</summary>
    public T? Or(T? current) => IsSet ? Value : current;
}

/// <summary>Отдаёт конвертер под конкретный <see cref="Patch{T}"/>.</summary>
public class PatchJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Patch<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        var valueType = typeToConvert.GetGenericArguments()[0];
        var converterType = typeof(PatchJsonConverter<>).MakeGenericType(valueType);

        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }
}

internal sealed class PatchJsonConverter<T> : JsonConverter<Patch<T>>
{
    // Конвертер должен видеть и null: именно им снимают значение.
    public override bool HandleNull => true;

    public override Patch<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        Patch<T>.Set(JsonSerializer.Deserialize<T>(ref reader, options));

    public override void Write(Utf8JsonWriter writer, Patch<T> value, JsonSerializerOptions options)
    {
        if (value.IsSet)
        {
            JsonSerializer.Serialize(writer, value.Value, options);
        }
        else
        {
            writer.WriteNullValue();
        }
    }
}
